"use server";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function sair() {
  const supabase = criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}
