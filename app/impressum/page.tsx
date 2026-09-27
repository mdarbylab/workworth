import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" updated="September 27, 2026">
      <p>
        This page identifies who operates WorkWorth, for visitors in Germany
        and the EU who look for it at this address.
      </p>

      <h2>Responsible for this website</h2>
      <p>
        Michael Darbyshire
        <br />
        Individual (sole proprietor)
        <br />
        Operating from the United States
        <br />
        Contact: <a href="mailto:hello@workworth.de">hello@workworth.de</a>
      </p>
      <p>No VAT identification number — WorkWorth does not currently sell anything.</p>

      <h2>A note on this notice</h2>
      <p>
        Germany&apos;s legal-notice requirement (§5 DDG, formerly the TMG)
        applies to operators targeting the German market. WorkWorth is built
        by an individual in the United States for a general, English-speaking
        audience, and whether that requirement extends to an operator in this
        position is a genuinely unsettled question — this page is provided in
        good faith rather than as a claim of formal compliance with it. If you
        have a legal notice, a rights request, or a dispute, write to{" "}
        <a href="mailto:hello@workworth.de">hello@workworth.de</a> and it will
        be handled directly and promptly.
      </p>

      <h2>Content</h2>
      <p>
        Despite careful control of content, no liability is assumed for the
        content of external links. The operators of linked pages are solely
        responsible for their content.
      </p>
    </LegalPage>
  );
}
