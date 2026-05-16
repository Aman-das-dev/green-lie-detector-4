import ResultClient from "./result-client"

export default async function ResultPage({ params }: { params: Promise<{ statementId: string }> }) {
  const { statementId } = await params
  return <ResultClient statementId={statementId} />
}
