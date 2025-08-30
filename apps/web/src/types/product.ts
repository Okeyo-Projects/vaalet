export type Product = {
  id: string
  title: string
  price: number
  currency: string
  rating: number
  reviewCount: number
  imageUrl?: string
  videoUrl?: string
  url: string
  source: string
  locationScope: 'local' | 'international'
}


