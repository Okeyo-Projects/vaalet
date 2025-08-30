import type { Product } from "@/types/product"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function Results({ products, advice }: { products: Product[]; advice?: string }) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8 grid gap-6">
      {advice ? (
        <Card>
          <CardHeader>
            <CardTitle>Conseil du Valet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6">{advice}</p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.title} className="w-full h-40 object-cover" />
            ) : null}
            <CardContent className="p-3 space-y-2">
              <div className="text-sm font-medium line-clamp-2">{p.title}</div>
              <div className="text-sm opacity-80">
                {p.price.toLocaleString(undefined, { style: 'currency', currency: p.currency })}
              </div>
              <div className="text-xs opacity-60 flex items-center gap-2">
                <span>★ {p.rating.toFixed(1)}</span>
                <span>({p.reviewCount})</span>
                <Badge variant="secondary">{p.source}</Badge>
                <Badge variant="outline">{p.locationScope === 'local' ? 'Local' : 'International'}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


