export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a9a8e] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analysis...</p>
      </div>
    </div>
  )
}
