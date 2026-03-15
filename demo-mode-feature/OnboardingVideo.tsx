interface OnboardingVideoProps {
  videoUrl: string // YouTube embed URL
}

export function OnboardingVideo({ videoUrl }: OnboardingVideoProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Welcome to StackDek! 👋</h2>
      <p className="text-gray-600 mb-4">
        Watch this 5-minute tour to see how StackDek works when you're using it every day.
      </p>
      <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
        <iframe
          src={videoUrl}
          title="StackDek Onboarding"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="text-sm text-gray-500 mt-4">
        💡 <strong>Tip:</strong> The demo data in your account shows what it looks like when you're actively using StackDek. 
        Clear it whenever you're ready to add your real jobs.
      </p>
    </div>
  )
}
