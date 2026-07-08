import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Container } from "@/components/layout/Container";

/** Minimal placeholder shell for legal pages. Real copy is published before launch. */
export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader className="sticky top-0 z-50" />
      <Container className="flex-1 py-16">
        <h1 className="font-headline text-[clamp(28px,4vw,40px)] tracking-[-0.02em]">
          {title}
        </h1>
        <div className="font-body-sm text-ink/75 mt-4 max-w-[640px] text-[16px] leading-[1.6]">
          {children}
        </div>
      </Container>
      <AppFooter />
    </div>
  );
}
