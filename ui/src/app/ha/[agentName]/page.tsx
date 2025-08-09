import SingleAgentIntro from "@/components/SingleAgentIntro";

export default function AgentPage({ params }: any) {
  return <SingleAgentIntro agentName={params.agentName} />;
}
