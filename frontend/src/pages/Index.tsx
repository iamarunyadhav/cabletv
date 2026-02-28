import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cable, Tv, Users, Clock, Shield, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Tv,
      title: "Premium Channels",
      description: "Access to 100+ premium TV channels with HD quality"
    },
    {
      icon: Users,
      title: "Family Packages",
      description: "Affordable packages designed for every family size"
    },
    {
      icon: Clock,
      title: "24/7 Service",
      description: "Round the clock technical support and service"
    },
    {
      icon: Shield,
      title: "Reliable Connection",
      description: "Stable and uninterrupted cable TV connection"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Cable className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Cable Vision
            </h1>
          </div>
          <Button onClick={() => navigate("/auth")} variant="default">
            Admin Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-5xl font-bold leading-tight">
            Your Premium Cable TV
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Entertainment Partner
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Experience the best in cable television with our wide range of channels,
            affordable packages, and exceptional customer service.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" className="gap-2">
              <Headphones className="w-5 h-5" />
              Contact Us
            </Button>
            <Button size="lg" variant="outline">
              View Packages
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Why Choose Cable Vision?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We provide reliable, high-quality cable TV services with customer satisfaction as our top priority
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary transition-colors">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Packages Preview */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Our Popular Packages</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose from our range of affordable packages tailored to your entertainment needs
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {["Basic", "Standard", "Premium"].map((plan, index) => (
            <Card key={index} className="border-2 hover:border-primary transition-all hover:shadow-lg">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <h4 className="text-2xl font-bold mb-2">{plan} Plan</h4>
                  <p className="text-3xl font-bold text-primary">LKR{(index + 1) * 299}</p>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    {30 + index * 30}+ Channels
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    {index >= 1 ? "HD" : "SD"} Quality
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    24/7 Support
                  </li>
                </ul>
                <Button className="w-full" variant={index === 1 ? "default" : "outline"}>
                  Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Cable Vision. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
