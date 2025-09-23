"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, ExternalLink, Loader2 } from "lucide-react"

import { useFavorites } from "@/hooks/useFavorites"

export default function Page() {
  const { data: favorites = [], isLoading, isError, error } = useFavorites()

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === undefined) {
      return "Prix suivi"
    }
    const safeCurrency = (currency || "EUR").toUpperCase()
    try {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: safeCurrency,
      }).format(price)
    } catch {
      return `${price.toLocaleString("fr-FR")} ${safeCurrency}`
    }
  }

  const hasFavorites = favorites.length > 0

  return (
    <div className="space-y-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/50 bg-pink-50 px-3 py-1 text-xs font-medium text-pink-600 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-200">
            <Heart className="h-3.5 w-3.5" />
            <span>Sélection premium</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Vos favoris</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Gardez à portée de main les produits qui vous inspirent. Valet surveille les évolutions de prix, la disponibilité et les nouvelles critiques pour chaque favori.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full">
            Exporter
          </Button>
          <Button size="sm" className="rounded-full">
            Ajouter un favori
          </Button>
        </div>
      </header>

      {isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de vos favoris…
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20">
          <CardContent className="py-6 text-sm text-red-600 dark:text-red-200">
            Impossible de charger vos favoris : {error instanceof Error ? error.message : "Erreur inconnue"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !hasFavorites && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Pas encore de favori</CardTitle>
            <CardDescription>
              Depuis le chat, cliquez sur « Tracker » pour enregistrer un produit et suivre automatiquement son évolution.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button>Explorer les meilleures offres</Button>
          </CardFooter>
        </Card>
      )}

      {!isLoading && !isError && hasFavorites && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite) => (
            <Card key={favorite.id} className="group h-full border border-border/60 transition hover:border-pink-300 hover:shadow-xl dark:hover:border-pink-400/60">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      {favorite.name}
                    </CardTitle>
                    {favorite.snippet && (
                      <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                        {favorite.snippet}
                      </CardDescription>
                    )}
                  </div>
                  {favorite.source && (
                    <Badge variant="secondary" className="rounded-full border-none bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {favorite.source}
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatPrice(favorite.price, favorite.currency)}
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-full border-dashed">
                  Ajouté le {new Date(favorite.createdAt).toLocaleDateString("fr-FR")}
                </Badge>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-dashed border-border/60 bg-muted/40 px-6 py-4 text-xs text-muted-foreground">
                <span>Suivi automatique des variations</span>
                <Button size="sm" className="h-8 text-xs" asChild>
                  <a href={favorite.url} target="_blank" rel="noreferrer" className="inline-flex items-center">
                    Voir l’offre
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
