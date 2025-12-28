import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Calendar, Clock, Users, Shield, ArrowRight } from "lucide-react";
import { Button } from "~/components/ui";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Liceo Clinic Scheduling System" },
    { name: "description", content: "Schedule your clinic appointments at Liceo de Cagayan University" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return redirect("/dashboard", { headers });
  }

  return json({ user: null }, { headers });
}

export default function Index() {
  const features = [
    {
      icon: Calendar,
      title: "Easy Scheduling",
      description: "Book your physical exam or consultation appointments with just a few clicks.",
    },
    {
      icon: Clock,
      title: "Flexible Time Slots",
      description: "Choose from available 2-hour time slots that fit your schedule.",
    },
    {
      icon: Users,
      title: "For Students & Employees",
      description: "Dedicated scheduling system for the entire Liceo community.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your health information is protected with enterprise-grade security.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-maroon-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gold-500 rounded-full flex items-center justify-center">
                <span className="text-maroon-900 font-bold text-xl">L</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Liceo Clinic</h1>
                <p className="text-sm text-gold-300">Scheduling System</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" className="text-white hover:bg-maroon-700">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary">Register</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-maroon-800 pb-20 pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              University Clinic
              <span className="block text-gold-400">Scheduling Made Simple</span>
            </h2>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto mb-8">
              Visit the Liceo de Cagayan University Clinic to schedule your physical examinations and consultations. 
              Our clinic staff will assist you in booking your appointment quickly and efficiently.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/view-schedules">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  View Schedules
                  <Calendar className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-maroon-800">
                  Staff Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Use Our System?</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our clinic scheduling system is designed to make healthcare access easier for the Liceo community.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-maroon-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-maroon-800" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <footer className="bg-maroon-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h3 className="font-bold text-lg">Liceo de Cagayan University</h3>
              <p className="text-sm text-gold-300">Clinic Scheduling System</p>
            </div>
            <div className="text-center md:text-right text-sm text-gray-300">
              <p>&copy; {new Date().getFullYear()} Liceo de Cagayan University</p>
              <p className="text-gold-300">All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
