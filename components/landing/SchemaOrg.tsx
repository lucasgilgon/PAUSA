export default function SchemaOrg() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "PAUSA",
        url: "https://www.pausaas.io",
        logo: "https://www.pausaas.io/logo.svg",
        founder: {
          "@type": "Person",
          name: "Lucas Gil González",
        },
        sameAs: [],
      },
      {
        "@type": "SoftwareApplication",
        name: "PAUSA",
        applicationCategory: "HealthApplication",
        description:
          "Documentación clínica con IA para psicólogos. Transcribe sesiones y genera notas en formato SOAP, DAP, BIRP y GIRP.",
        operatingSystem: "Web",
        url: "https://www.pausaas.io",
        offers: {
          "@type": "Offer",
          price: "19",
          priceCurrency: "EUR",
          priceValidUntil: "2026-12-31",
          availability: "https://schema.org/InStock",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "42",
        },
        author: {
          "@type": "Organization",
          name: "PAUSA",
          url: "https://www.pausaas.io",
        },
      },
      {
        "@type": "WebPage",
        url: "https://www.pausaas.io",
        name: "PAUSA — Menos papeleo, más psicología",
        description:
          "La IA que transcribe tus sesiones y genera notas clínicas automáticamente. Formatos SOAP, DAP, BIRP, GIRP. Servidores en Europa.",
        inLanguage: "es",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
