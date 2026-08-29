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
  return (
    <div className="half-assembly-media">
      <span className="half-assembly-exterior">
        <img alt={alt} loading={loading} src={src} />
      </span>
      <span className="half-assembly-photo-pending">
        <ImageOff aria-hidden="true" size={22} />
        <strong>No-coil interior</strong>
        <small>Photo pending</small>
      </span>
    </div>
  );
}
