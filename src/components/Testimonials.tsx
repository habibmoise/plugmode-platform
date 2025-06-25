import React from 'react';
import { Star, Quote } from 'lucide-react';

export function Testimonials() {
  const testimonials = [
    {
      name: 'Amara Okafor',
      location: 'Lagos, Nigeria',
      role: 'Frontend Developer at TechGlobal',
      content: 'PlugMode connected me with my dream remote job. The AI matching was incredibly accurate, and the support throughout the process was exceptional.',
      rating: 5,
      avatar: '/pexels-divinetechygirl-1181581.jpg'
    },
    {
      name: 'Siti Rahman',
      location: 'Jakarta, Indonesia',
      role: 'UX Designer at DesignHub',
      content: 'The platform understood my regional context and helped me navigate the global job market. Now I work with clients from around the world.',
      rating: 5,
      avatar: '/pexels-sewupari-studio-198849716-11719268.jpg'
    },
    {
      name: 'Carlos Mendoza',
      location: 'São Paulo, Brazil',
      role: 'Data Scientist at AnalyticsCorp',
      content: 'PlugMode made the impossible possible. I went from local opportunities to working with a Fortune 500 company remotely.',
      rating: 5,
      avatar: '/pexels-uiliamnornberg-30767577.jpg'
    }
  ];

  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            Success Stories from Our Community
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Real professionals, real results, real career transformations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-103 hover-lift">
              {/* Photo and user info first - made more prominent */}
              <div className="flex flex-col items-center text-center mb-6">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name}
                  className="w-32 h-32 rounded-full object-cover mb-4 ring-4 ring-blue-100"
                />
                <div>
                  <div className="font-semibold text-black text-lg">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.location}</div>
                  <div className="text-sm text-blue-600 font-medium">{testimonial.role}</div>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center justify-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Quote icon */}
              <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Quote className="h-6 w-6 text-blue-600" />
              </div>
              
              {/* Testimonial content */}
              <p className="text-gray-700 leading-relaxed text-center">
                "{testimonial.content}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}