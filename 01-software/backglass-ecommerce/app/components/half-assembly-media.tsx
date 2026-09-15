import { ImageOff } from "lucide-react";

interface HalfAssemblyMediaProps {
  alt: string;
  loading?: "eager" | "lazy";
  src: string;
}

export function HalfAssemblyMedia({
  alt,
  loading = "lazy",
  src,
}: HalfAssemblyMediaProps) {
  const hasLocalReviewAsset = src.startsWith("/");

  return (
    <div className="half-assembly-media">
      <span className="half-assembly-exterior">
        {hasLocalReviewAsset ? (
          <img alt={alt} loading={loading} src={src} />
        ) : (
          <span className="half-assembly-exterior-pending">
            <ImageOff aria-hidden="true" size={22} />
            <strong>Exterior photo</strong>
            <small>Unavailable</small>
          </span>
        )}
      </span>
      <span className="half-assembly-photo-pending">
        <ImageOff aria-hidden="true" size={22} />
        <strong>No-coil interior</strong>
        <small>Photo pending</small>
      </span>
    </div>
  );
}
