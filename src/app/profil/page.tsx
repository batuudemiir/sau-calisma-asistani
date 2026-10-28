import type { Metadata } from "next";
import { ProfileView } from "@/components/ProfileView";

export const metadata: Metadata = { title: "Profil", description: "Puanların, seviyen, katkıların, aylık ödüller ve görünüm ayarı." };

export default function ProfilePage() {
  return <ProfileView />;
}
