import type { Metadata } from "next";
import { ProfileView } from "@/components/ProfileView";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return <ProfileView />;
}
