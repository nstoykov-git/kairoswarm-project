import SingleAgentIntro from "@/components/SingleAgentIntro";

type PageProps = {
  params: {
    agentName: string;
  };
};

export default function AgentPage({ params }: PageProps) {
  return <SingleAgentIntro agentName={params.agentName} />;
}
