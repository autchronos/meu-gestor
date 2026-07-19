import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SecaoRecursos } from "@/components/SecaoRecursos";
import { SecaoComoFunciona } from "@/components/SecaoComoFunciona";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SecaoRecursos />
        <SecaoComoFunciona />
      </main>
      <Footer />
    </>
  );
}
