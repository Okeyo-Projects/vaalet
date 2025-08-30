import Image from "next/image"

export type ProductCardProps = {
  id: string
  name: string
  price: number
  currency: string
  url: string
  imageUrl?: string
  snippet?: string
}

export function ProductCard({ id, name, price, currency, url, imageUrl, snippet }: ProductCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {imageUrl && (
        <Image src={imageUrl} alt={name} width={640} height={360} className="h-40 w-full object-cover" />
      )}
      <div className="p-3">
        <div className="font-medium line-clamp-2">{name}</div>
        <div className="text-sm text-muted-foreground">
          {price} {currency}
        </div>
        {snippet && (
          <div className="text-sm text-muted-foreground line-clamp-3 mt-1">{snippet}</div>
        )}
        <a href={url} target="_blank" rel="noreferrer" className="text-primary text-sm mt-2 inline-block">
          Voir le produit
        </a>
      </div>
    </div>
  )
}


