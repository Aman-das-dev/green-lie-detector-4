import EvaluateClient from "./evaluate-client"

export default async function EvaluatePage({ params }: { params: Promise<{ statementId: string }> }) {
  const { statementId } = await params
  return <EvaluateClient statementId={statementId} />
}
