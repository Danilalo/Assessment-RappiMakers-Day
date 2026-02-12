import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { Chatbot } from "@/components/dashboard/chatbot";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main>
        <DashboardContent />
      </main>
      <Chatbot />
    </div>
  );
}
