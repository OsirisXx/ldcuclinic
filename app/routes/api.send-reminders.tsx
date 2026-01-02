import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Resend } from "resend";
import { createSupabaseServerClient, createSupabaseAdminClient } from "~/lib/supabase.server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is staff (admin, doctor, nurse)
  const adminClient = createSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile || !["admin", "doctor", "nurse", "employee"].includes(profile.role)) {
    return json({ error: "Unauthorized - Staff only" }, { status: 403 });
  }

  const formData = await request.formData();
  const targetDate = formData.get("targetDate") as string; // "today", "tomorrow", or specific date
  const campusId = formData.get("campusId") as string;

  if (!targetDate || !campusId) {
    return json({ error: "Target date and campus are required" }, { status: 400 });
  }

  // Calculate the actual date
  let dateStr: string;
  const today = new Date();
  
  if (targetDate === "today") {
    dateStr = today.toISOString().split("T")[0];
  } else if (targetDate === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = tomorrow.toISOString().split("T")[0];
  } else {
    dateStr = targetDate; // Specific date passed
  }

  // Fetch appointments for the target date with patient emails
  const { data: appointments, error: fetchError } = await adminClient
    .from("appointments")
    .select(`
      id,
      appointment_date,
      start_time,
      end_time,
      appointment_type,
      patient_name,
      patient_email,
      patient_id,
      status
    `)
    .eq("appointment_date", dateStr)
    .eq("campus_id", campusId)
    .eq("status", "scheduled");

  if (fetchError) {
    return json({ error: fetchError.message }, { status: 500 });
  }

  if (!appointments || appointments.length === 0) {
    return json({ 
      success: true, 
      message: "No scheduled appointments found for this date",
      sent: 0,
      skipped: 0
    });
  }

  // Filter appointments with valid emails
  const appointmentsWithEmail = appointments.filter(
    (appt) => appt.patient_email && appt.patient_email.includes("@")
  );

  const skipped = appointments.length - appointmentsWithEmail.length;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Send emails
  for (const appt of appointmentsWithEmail) {
    try {
      const formattedDate = new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const formattedTime = formatTime12Hour(appt.start_time);
      const appointmentTypeLabel = appt.appointment_type === "physical_exam" 
        ? "Physical Examination" 
        : "Consultation";

      await resend.emails.send({
        from: "LDCU Clinic <onboarding@resend.dev>",
        to: appt.patient_email,
        subject: `📅 Appointment Reminder - ${formattedDate} | LDCU Clinic`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with LDCU Colors (Maroon & Gold) -->
          <tr>
            <td style="background: linear-gradient(135deg, #7B1113 0%, #5a0d0e 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #FFD700; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                LICEO DE CAGAYAN UNIVERSITY
              </h1>
              <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 16px; letter-spacing: 1px;">
                University Clinic
              </p>
            </td>
          </tr>

          <!-- Gold Accent Bar -->
          <tr>
            <td style="background-color: #FFD700; height: 4px;"></td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #7B1113; margin: 0 0 20px 0; font-size: 24px;">
                📋 Appointment Reminder
              </h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${appt.patient_name || "Valued Patient"}</strong>,
              </p>
              
              <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                This is a friendly reminder about your upcoming appointment at the LDCU University Clinic. Please review the details below:
              </p>

              <!-- Appointment Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #fdf6f6 0%, #fff9e6 100%); border-radius: 10px; border: 1px solid #e8d4d4; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e8d4d4;">
                          <span style="color: #7B1113; font-weight: bold; font-size: 14px;">📅 DATE</span><br>
                          <span style="color: #333333; font-size: 18px; font-weight: 600;">${formattedDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e8d4d4;">
                          <span style="color: #7B1113; font-weight: bold; font-size: 14px;">🕐 TIME</span><br>
                          <span style="color: #333333; font-size: 18px; font-weight: 600;">${formattedTime}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #7B1113; font-weight: bold; font-size: 14px;">🏥 TYPE</span><br>
                          <span style="color: #333333; font-size: 18px; font-weight: 600;">${appointmentTypeLabel}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Important Notes -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fff8e1; border-radius: 8px; border-left: 4px solid #FFD700; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="color: #7B1113; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">
                      ⚠️ Important Reminders:
                    </p>
                    <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Please arrive <strong>10-15 minutes</strong> before your scheduled time</li>
                      <li>Bring a valid ID and any relevant medical documents</li>
                      <li>If you need to reschedule, please contact us as soon as possible</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions or need to make changes to your appointment, please don't hesitate to contact the clinic.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #7B1113; padding: 25px 40px; text-align: center;">
              <p style="color: #FFD700; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">
                LDCU University Clinic
              </p>
              <p style="color: #ffffff; font-size: 12px; margin: 0 0 10px 0;">
                Liceo de Cagayan University, Cagayan de Oro City
              </p>
              <p style="color: rgba(255,255,255,0.7); font-size: 11px; margin: 0;">
                This is an automated message from the LDCU Clinic Scheduling System.<br>
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      });
      sent++;
    } catch (emailError: any) {
      failed++;
      errors.push(`Failed to send to ${appt.patient_email}: ${emailError.message}`);
    }
  }

  return json({
    success: true,
    message: `Sent ${sent} reminder(s) for ${dateStr}`,
    sent,
    skipped,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}

function formatTime12Hour(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
