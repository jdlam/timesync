import { createFileRoute, Link } from '@tanstack/react-router'
import { Calendar, Users, Zap, Clock, Eye, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  const features = [
    {
      icon: <Zap className="w-12 h-12 text-cyan-400" />,
      title: 'No Signup Required',
      description:
        'Create events instantly without creating an account. Just share a link and start collecting availability.',
    },
    {
      icon: <Eye className="w-12 h-12 text-cyan-400" />,
      title: 'Visual Heatmap',
      description:
        'See everyone\'s availability at a glance with our color-coded heatmap. Find the best time instantly.',
    },
    {
      icon: <Smartphone className="w-12 h-12 text-cyan-400" />,
      title: 'Mobile Friendly',
      description:
        'Works perfectly on any device. Respondents can easily select their availability on phones, tablets, or desktop.',
    },
    {
      icon: <Clock className="w-12 h-12 text-cyan-400" />,
      title: 'Flexible Time Slots',
      description:
        'Choose from 15, 30, or 60-minute time slots. Set custom time ranges that work for your schedule.',
    },
    {
      icon: <Users className="w-12 h-12 text-cyan-400" />,
      title: 'Unlimited Participants',
      description:
        'Collect availability from up to 20 participants on the free tier. Perfect for team meetings and events.',
    },
    {
      icon: <Calendar className="w-12 h-12 text-cyan-400" />,
      title: 'Multi-Day Support',
      description:
        'Select up to 14 dates for your event. Great for finding the best day and time across a whole week.',
    },
  ]

  const steps = [
    {
      number: '1',
      title: 'Create Your Event',
      description: 'Set up your event with dates, times, and time slots. No account needed.',
    },
    {
      number: '2',
      title: 'Share the Link',
      description: 'Send the public link to participants. They can respond in seconds.',
    },
    {
      number: '3',
      title: 'See Who\'s Available',
      description: 'View the heatmap to instantly find the best time for everyone.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted to-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 leading-tight">
            Find the Perfect Time
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              For Your Group
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            The fastest way to coordinate schedules. No signups, no hassle, just results.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/events/create">
              <Button
                size="lg"
                className="text-lg px-8 py-6 shadow-lg shadow-primary/50"
              >
                Create Event
              </Button>
            </Link>
          </div>

          {/* Demo Screenshot Placeholder */}
          <div className="mt-16 rounded-xl overflow-hidden border-2 border-border shadow-2xl">
            <div className="bg-card p-8">
              <div className="grid grid-cols-5 gap-2">
                {/* Simple grid visualization */}
                <div className="col-span-1 text-muted-foreground text-sm space-y-2">
                  <div className="h-8 flex items-center">Time</div>
                  <div className="h-10">9:00</div>
                  <div className="h-10">9:30</div>
                  <div className="h-10">10:00</div>
                  <div className="h-10">10:30</div>
                </div>
                {['Mon', 'Tue', 'Wed', 'Thu'].map((day, i) => (
                  <div key={day} className="space-y-2">
                    <div className="h-8 text-center text-muted-foreground font-semibold">{day}</div>
                    <div className="h-10 rounded bg-cyan-600/80 flex items-center justify-center text-white font-bold">
                      {4 - i}
                    </div>
                    <div className="h-10 rounded bg-green-600/80 flex items-center justify-center text-white font-bold">
                      {5 - i}
                    </div>
                    <div className="h-10 rounded bg-yellow-600/60 flex items-center justify-center text-white font-bold">
                      {3 - i}
                    </div>
                    <div className="h-10 rounded bg-red-600/40 flex items-center justify-center text-white font-bold">
                      {2 - i}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-muted-foreground text-sm mt-4">
                Color-coded heatmap shows availability at a glance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple, powerful scheduling tools that just work
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Get started in seconds. No learning curve required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-cyan-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/events/create">
              <Button
                size="lg"
                className="text-lg px-8 py-6"
              >
                Create Your First Event
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to Coordinate?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Create your event now and find the perfect time for your team.
          </p>
          <Link to="/events/create">
            <Button
              size="lg"
              className="text-lg px-12 py-6 shadow-lg shadow-primary/50"
            >
              Get Started - It's Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground text-sm">
          <p>TimeSync - Find the perfect time for your group</p>
          <p className="mt-2">
            Built with TanStack Start, React, and Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  )
}
