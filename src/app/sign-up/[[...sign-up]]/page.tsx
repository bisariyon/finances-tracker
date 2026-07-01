import { SignUp } from '@clerk/nextjs';
import { dark, } from '@clerk/ui/themes';

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 60% 20%, #1e1040 0%, #0d0d1a 70%)' }}
    >
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 text-3xl mb-4">
            ₹
          </div>
          <h1 className="text-3xl font-bold text-white">Fintrack</h1>
          <p className="text-white/50 text-sm mt-2">Start tracking your finances today</p>
        </div>
        <SignUp
          appearance={{
            theme: dark,
            variables: {
              colorPrimary: '#8b5cf6',
              colorBackground: '#141427',
              colorInput: '#1f1f35',
              borderRadius: '12px',
            },
          }}
        />
      </div>
    </div>
  );
}
