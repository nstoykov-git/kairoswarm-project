import SingleAgentIntro from "@/components/SingleAgentIntro";

export default function AgentPage({ params }: { params: { agentName: string } }) {
  return <SingleAgentIntro agentName={params.agentName} />;
}
