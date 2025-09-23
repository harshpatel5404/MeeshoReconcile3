import { Heart, Github, Mail, Globe } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Brand Section */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ReconMe
            </h3>
          </div>
          
          <p className="text-slate-600 text-sm leading-relaxed max-w-md mb-4">
            Smart Payment Reconciliation Platform for e-commerce businesses
          </p>

          {/* Bottom Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span>© {currentYear} ReconMe.</span>
              <span>Developed By</span>
               <a 
                href="https://growthx-media.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
              >
                GrowthX Media
              </a>
            </div>
             
            </div>
          </div>
        </div>
    </footer>
  );
}