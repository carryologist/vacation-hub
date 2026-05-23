import SetupWizard from './SetupWizard';

export default function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-2xl">
        <SetupWizard />
      </div>
    </div>
  );
}
