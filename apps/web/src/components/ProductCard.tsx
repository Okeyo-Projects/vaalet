import Image from "next/image"
import { ExternalLink, ShoppingBag, Eye } from "lucide-react"
import { Button } from "./ui/button"

export type ProductCardProps = {
  id: string
  name: string
  price: number
  currency: string
  url: string
  imageUrl?: string
  snippet?: string
  source?: string
  onTracker?: (product: {
    id: string
    name: string
    price: number
    currency: string
    url: string
    imageUrl?: string
    snippet?: string
    source?: string
  }) => void
}

export function ProductCard({ id, name, price, currency, url, imageUrl, snippet, source, onTracker }: ProductCardProps) {

  return (
    <div className="glass-card-subtle animate-lift group overflow-hidden rounded-xl pt-3 flex flex-col h-full">
      {imageUrl && (
        <div className="relative overflow-hidden bg-white dark:bg-gray-800">
          <Image 
            src={imageUrl} 
            alt={name} 
            width={640} 
            height={360} 
            className="h-48 w-full object-contain group-hover:scale-105 transition-transform duration-300" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Overlay Track Button */}

        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
          {name}
        </h3>
        
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="w-4 h-4 text-green-600" />
          <div className="text-lg font-bold text-gradient-primary">
            {price.toLocaleString()} {currency}
          </div>
        </div>
        
        {snippet && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 leading-relaxed">
            {snippet}
          </p>
        )}
        
        <div className="flex gap-2 mt-auto">
        <a 
          href={url} 
          target="_blank" 
          rel="noreferrer" 
          className="inline-flex flex-1 justify-center items-center gap-2 bg-gradient-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-modern transition-all duration-300"
        >
          <span>Voir le produit</span>
          <ExternalLink className="w-4 h-4" />
        </a>
        <Button 
          variant="outline" 
          size="default"
          onClick={() =>
            onTracker?.({ id, name, price, currency, url, imageUrl, snippet, source })
          }
        >
          <Eye className="w-4 h-4" />
          Tracker
        </Button>
        </div>
      </div>
    </div>
  )
}

