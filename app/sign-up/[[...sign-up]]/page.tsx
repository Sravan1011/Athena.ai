import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <SignUp 
          path="/sign-up" 
          routing="path" 
          signInUrl="/sign-in"
          appearance={{
            elements: {
              card: 'glass hover-lift border-white/20 bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl',
              headerTitle: 'text-3xl font-bold gradient-text',
              headerSubtitle: 'text-slate-600 text-lg',
              formFieldInput: 'border-2 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl bg-white/80 backdrop-blur-sm',
              footerActionText: 'text-slate-600',
              footerActionLink: 'text-blue-600 hover:text-blue-700 font-semibold',
              formButtonPrimary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200',
            },
          }}
        />
      </div>
    </div>
  );
}
