import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Do I need a visa to work remotely for international companies?',
      answer: 'No, remote work typically doesn\'t require a work visa since you\'re working from your home country. However, tax implications may vary, and we provide guidance on these matters.'
    },
    {
      question: 'How do international payments work?',
      answer: 'Most companies use platforms like Wise, Payoneer, or direct bank transfers. We help you set up the best payment methods for your region and provide guidance on managing international payments.'
    },
    {
      question: 'What if I don\'t have extensive experience?',
      answer: 'PlugMode welcomes professionals at all levels. We focus on potential and skills, not just years of experience. Our AI matching considers your unique background and growth trajectory.'
    },
    {
      question: 'Are the job opportunities legitimate?',
      answer: 'Yes, all opportunities are vetted by our team. We partner with established companies and startups that are committed to hiring global talent and providing fair compensation.'
    },
    {
      question: 'What support do you provide for different time zones?',
      answer: 'We help you find opportunities that match your preferred working hours or companies that are flexible with time zones. Many of our partner companies are experienced with global remote teams.'
    },
    {
      question: 'How does the AI coaching work?',
      answer: 'Our AI coaching provides personalized career advice, interview preparation, resume optimization, and skill development recommendations based on your goals and the global job market.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Common questions about remote work and global opportunities
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-black">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}