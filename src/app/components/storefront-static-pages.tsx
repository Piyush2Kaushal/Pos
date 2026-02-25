import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Mail, Phone, MapPin, Clock, CheckCircle2, ChevronRight,
  Users, Package, Award, TrendingUp, Zap, ShieldCheck, Headphones,
  Star, ArrowRight, Globe,
} from "lucide-react";
import { toast } from "sonner";

type StorePage = "home" | "products" | "product" | "checkout" | "about" | "contact";

interface StaticPagesProps {
  navigate: (page: StorePage, data?: { product?: any; category?: string }) => void;
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────

export function StorefrontAboutPage({ navigate }: StaticPagesProps) {
  const teamMembers = [
    { name: "Ben Mitchell", role: "Founder & CEO", initial: "BM", color: "from-blue-500 to-indigo-600" },
    { name: "Naomi Clarke", role: "Operations Manager", initial: "NC", color: "from-purple-500 to-pink-600" },
    { name: "Marcus Wong", role: "Head of Inventory", initial: "MW", color: "from-teal-500 to-cyan-600" },
    { name: "Priya Shah", role: "Customer Success", initial: "PS", color: "from-amber-500 to-orange-600" },
  ];

  const milestones = [
    { year: "2018", event: "BNM Parts founded in London" },
    { year: "2020", event: "Expanded to wholesale & trader pricing tiers" },
    { year: "2022", event: "Launched online ordering platform" },
    { year: "2024", event: "Over 10,000 orders fulfilled" },
    { year: "2026", event: "100+ products, 25+ regular customers" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm text-gray-500">
          <button className="hover:text-blue-600" onClick={() => navigate("home")}>Home</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-800 font-medium">About Us</span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-gray-900 to-blue-950 text-white py-20">
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-blue-600/20 text-blue-300 border border-blue-400/30 mb-4">About BNM Parts</Badge>
          <h1 className="text-4xl font-bold mb-4">
            Your Trusted Source for{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Mobile Accessories
            </span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Since 2018, BNM Parts has been supplying premium mobile accessories to retailers,
            traders, and consumers across the UK. Quality you can trust, prices that work for your business.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Package, value: "100+", label: "Products", color: "text-blue-600 bg-blue-50" },
            { icon: Users, value: "25+", label: "Regular Customers", color: "text-purple-600 bg-purple-50" },
            { icon: TrendingUp, value: "10K+", label: "Orders Fulfilled", color: "text-green-600 bg-green-50" },
            { icon: Award, value: "8+", label: "Years Experience", color: "text-amber-600 bg-amber-50" },
          ].map(({ icon: Icon, value, label, color }) => (
            <Card key={label} className="rounded-2xl border-gray-200 text-center">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mx-auto mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Story */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                BNM Parts was founded in 2018 with a simple mission: provide reliable,
                affordable mobile accessories to everyone — from individual consumers to large wholesale buyers.
              </p>
              <p>
                We started with a small range of phone cases and charging cables, quickly expanding
                as demand grew. Today, we stock over 100 products across 6 categories, serving
                retailers, traders, and direct customers across the UK.
              </p>
              <p>
                Our three-tier pricing model — <strong>Retailer</strong>, <strong>Trader (15% off)</strong>,
                and <strong>Wholesaler (30% off)</strong> — ensures every customer gets the best value
                for their business model.
              </p>
            </div>
            <Button
              className="mt-6 gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate("contact")}
            >
              Get in Touch <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1683770997177-0603bd44d070?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600&q=80"
              alt="BNM Parts Team"
              className="w-full rounded-2xl shadow-xl"
            />
            <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white rounded-2xl p-4 shadow-lg">
              <p className="text-2xl font-bold">8+</p>
              <p className="text-xs text-blue-200">Years of Excellence</p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Choose BNM Parts</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: "Genuine Products", desc: "Every product is authentic and certified. We source directly from trusted manufacturers.", color: "from-green-500 to-emerald-600" },
              { icon: Zap, title: "Fast Dispatch", desc: "Orders placed before 2 PM are dispatched same day. We understand your business depends on speed.", color: "from-blue-500 to-indigo-600" },
              { icon: Headphones, title: "Expert Support", desc: "Our team has deep product knowledge. We're here to help you find exactly what you need.", color: "from-purple-500 to-pink-600" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <Card key={title} className="rounded-2xl border-gray-200 overflow-hidden">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2 hidden md:block" />
            <div className="space-y-6">
              {milestones.map((m, i) => (
                <div key={m.year} className={`flex items-center gap-6 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  <div className="flex-1 hidden md:block" />
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-lg shadow-blue-200 z-10">
                    {m.year.slice(2)}
                  </div>
                  <div className={`flex-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm ${i % 2 === 0 ? "" : "md:text-right"}`}>
                    <p className="text-xs font-bold text-blue-600 mb-1">{m.year}</p>
                    <p className="text-sm text-gray-700 font-medium">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Meet the Team</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {teamMembers.map((member) => (
              <Card key={member.name} className="rounded-2xl border-gray-200 text-center">
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                    <span className="text-white font-bold text-lg">{member.initial}</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{member.role}</p>
                  <div className="flex justify-center mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-10 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to Shop?</h2>
          <p className="text-blue-100 mb-6">Browse our full catalog of premium mobile accessories</p>
          <div className="flex gap-3 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 gap-2"
              onClick={() => navigate("products")}
            >
              Shop Now <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => navigate("contact")}
            >
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CONTACT PAGE ─────────────────────────────────────────────────────────────

export function StorefrontContactPage({ navigate }: StaticPagesProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setSubmitted(true);
  };

  const businessHours = [
    { day: "Monday – Friday", hours: "9:00 AM – 6:00 PM" },
    { day: "Saturday", hours: "10:00 AM – 4:00 PM" },
    { day: "Sunday", hours: "Closed" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm text-gray-500">
          <button className="hover:text-blue-600" onClick={() => navigate("home")}>Home</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-800 font-medium">Contact Us</span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-2">Get in Touch</h1>
          <p className="text-blue-100">We're here to help. Reach out about orders, wholesale pricing, or anything else.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            {/* Contact Details */}
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-bold text-gray-900 mb-3">Contact Information</h2>
                {[
                  { icon: Mail, label: "Email", value: "contact@bnmparts.com", href: "mailto:contact@bnmparts.com" },
                  { icon: Phone, label: "Phone", value: "+44 20 1234 5678", href: "tel:+442012345678" },
                  { icon: MapPin, label: "Address", value: "123 Parts Lane, London, E1 6RF, UK" },
                  { icon: Globe, label: "Website", value: "www.bnmparts.com" },
                ].map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      {href ? (
                        <a href={href} className="text-sm font-medium text-gray-800 hover:text-blue-600">{value}</a>
                      ) : (
                        <p className="text-sm font-medium text-gray-800">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-gray-900">Business Hours</h2>
                </div>
                <div className="space-y-2">
                  {businessHours.map(({ day, hours }) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="text-gray-600">{day}</span>
                      <span className={`font-medium ${hours === "Closed" ? "text-red-500" : "text-gray-800"}`}>{hours}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Wholesale Enquiry */}
            <Card className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border-0 text-white">
              <CardContent className="p-6">
                <h2 className="font-bold mb-2">Wholesale Enquiries</h2>
                <p className="text-blue-100 text-sm mb-3">
                  Wholesalers get 30% off and traders get 15% off all products. Get in touch to set up your account.
                </p>
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  Up to 30% Discount Available
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h2>
                    <p className="text-gray-500 mb-6">We'll get back to you within 24 hours at {form.email}</p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" className="rounded-xl" onClick={() => { setForm({ name: "", email: "", phone: "", subject: "", message: "" }); setSubmitted(false); }}>
                        Send Another
                      </Button>
                      <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => navigate("products")}>
                        Shop Now <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Send us a Message</h2>
                      <p className="text-sm text-gray-500">We typically respond within 2-4 business hours</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Full Name *</Label>
                        <Input
                          className="rounded-xl mt-1"
                          placeholder="Your full name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Email Address *</Label>
                        <Input
                          className="rounded-xl mt-1"
                          type="email"
                          placeholder="your@email.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Phone Number</Label>
                        <Input
                          className="rounded-xl mt-1"
                          placeholder="+44 ..."
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Subject</Label>
                        <Input
                          className="rounded-xl mt-1"
                          placeholder="What's this about?"
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Message *</Label>
                      <Textarea
                        className="rounded-xl mt-1 resize-none"
                        rows={6}
                        placeholder="Tell us how we can help you..."
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      Your information is safe with us. We never share your data with third parties.
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 gap-2 rounded-xl" size="lg">
                      Send Message <ArrowRight className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
