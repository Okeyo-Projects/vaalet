import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, Shirt, Home, Plane, Dumbbell, Utensils, Laptop, HeartPulse } from "lucide-react"

const interestGroups = [
  {
    title: "Tech & Gadgets",
    description: "Smartphones, ordinateurs, accessoires et objets connectés.",
    icon: Laptop,
    tags: ["Apple", "Samsung", "IA", "Productivité"],
  },
  {
    title: "Mode & Lifestyle",
    description: "Tendances, basiques et collaborations exclusives.",
    icon: Shirt,
    tags: ["Streetwear", "Luxe", "Sneakers", "Bijoux"],
  },
  {
    title: "Maison & Décoration",
    description: "Mobilier, électroménager et inspirations déco.",
    icon: Home,
    tags: ["Cuisine", "Salon", "Smart Home", "Rangement"],
  },
  {
    title: "Bien-être & Santé",
    description: "Sport, nutrition et soins personnels pour un quotidien équilibré.",
    icon: HeartPulse,
    tags: ["Fitness", "Yoga", "Compléments", "Sommeil"],
  },
  {
    title: "Voyages & Loisirs",
    description: "Destinations, expériences et équipements pour explorer.",
    icon: Plane,
    tags: ["Week-end", "Aventure", "Culture", "Famille"],
  },
  {
    title: "Cuisine & Gastronomie",
    description: "Équipements, recettes et ingrédients d’exception.",
    icon: Utensils,
    tags: ["Café", "Recettes", "Chefs", "Local"],
  },
]

export default function Page() {
  return (
    <div className="space-y-8 px-4 py-8 lg:px-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Personnalisation intelligente</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Vos centres d’intérêt
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Sélectionnez les domaines qui vous inspirent pour que Valet affine ses recommandations et vous trouve les offres les plus pertinentes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-3 py-1">7 catégories suivies</span>
          <span className="rounded-full bg-muted px-3 py-1">Mise à jour en temps réel</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {interestGroups.map((group) => {
          const Icon = group.icon
          return (
            <Card key={group.title} className="h-full border border-border/60 shadow-sm transition hover:border-blue-300 hover:shadow-lg dark:hover:border-blue-400/60">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      {group.title}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-muted-foreground">
                      {group.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {group.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full border-none bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {tag}
                  </Badge>
                ))}
                <Button variant="outline" size="sm" className="mt-2 w-full border-dashed text-sm">
                  Personnaliser
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="rounded-3xl border border-dashed border-blue-300/60 bg-gradient-to-r from-blue-50 via-white to-purple-50 p-6 text-sm text-gray-700 shadow-inner dark:border-blue-400/40 dark:from-blue-950/30 dark:via-background dark:to-purple-950/20 dark:text-gray-200">
        En précisant vos centres d’intérêt, vous recevez des suggestions plus pertinentes, des alertes ciblées et des analyses ultra-personnalisées dès le lancement de vos recherches.
      </section>
    </div>
  )
}

