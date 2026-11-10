import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/components/fleet/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <App />;
}
