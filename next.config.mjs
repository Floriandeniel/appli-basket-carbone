/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export statique : l'application tourne entièrement dans le navigateur (aucun serveur requis).
  output: "export",
  // STATIC_DEMO=1 produit des chemins relatifs, pour héberger la démo dans un sous-dossier.
  ...(process.env.STATIC_DEMO ? { assetPrefix: "." } : {}),
  images: { unoptimized: true },
};

export default nextConfig;
