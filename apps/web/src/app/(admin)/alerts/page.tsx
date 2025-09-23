"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, BellRing, Bell, Clock, CircleCheck, Loader2 } from "lucide-react"
import { useAlerts } from "@/hooks/useAlerts"

const statusMap = {
  active: {
    icon: CircleCheck,
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    label: "Active",
  },
  paused: {
    icon: Clock,
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    label: "En pause",
  },
}

export default function Page() {
  const { data: alerts = [], isLoading, isError, error } = useAlerts()

  const formatObjective = (alert: (typeof alerts)[number]) => {
    switch (alert.objectiveType) {
      case 'price_below':
        return alert.targetPrice != null
          ? `Informer lorsque le prix passe sous ${alert.targetPrice.toLocaleString('fr-FR')}`
          : 'Informer lorsque le prix passe sous votre seuil'
      case 'price_range':
        return alert.minPrice != null && alert.maxPrice != null
          ? `Suivi entre ${alert.minPrice.toLocaleString('fr-FR')} et ${alert.maxPrice.toLocaleString('fr-FR')}`
          : 'Suivi d’une plage de prix personnalisée'
      case 'price_drop_percent':
        return alert.dropPercent != null
          ? `Notifier après une baisse de ${alert.dropPercent}%`
          : 'Notifier lors d’une baisse significative du prix'
      default:
        return 'Objectif personnalisé'
    }
  }

  const hasAlerts = alerts.length > 0

  return (
    <div className="space-y-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/50 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
            <BellRing className="h-3.5 w-3.5" />
            <span>Suivi intelligent</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Alertes personnalisées</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Recevez automatiquement les meilleures offres dès qu’elles correspondent à vos critères. Ajustez les alertes par catégorie, budget ou canal de notification.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full border-dashed">
            Gérer les canaux
          </Button>
          <Button size="sm" className="rounded-full">
            Créer une alerte
          </Button>
        </div>
      </header>

      {isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de vos alertes…
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20">
          <CardContent className="py-6 text-sm text-red-600 dark:text-red-200">
            Impossible de charger vos alertes : {error instanceof Error ? error.message : 'Erreur inconnue'}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !hasAlerts && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Aucune alerte créée</CardTitle>
            <CardDescription>
              Lancez une recherche puis cliquez sur « Créer une alerte » pour suivre automatiquement les nouvelles offres.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm">Créer ma première alerte</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && hasAlerts && (
        <div className="grid gap-4">
          {alerts.map((alert) => {
            const statusKey = alert.isActive ? 'active' : 'paused'
            const status = statusMap[statusKey]
            const StatusIcon = status.icon
            return (
              <Card key={alert.id} className="border border-border/60 bg-card/60 shadow-sm transition hover:border-violet-300 hover:shadow-lg dark:hover:border-violet-400/60">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-2">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      {alert.query}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {formatObjective(alert)}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1">Pays : {alert.country.toUpperCase()}</span>
                      <span className="rounded-full bg-muted px-3 py-1">Créée le {new Date(alert.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <Badge className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.badgeClass}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 border-t border-dashed border-border/60 pt-4 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                    <Bell className="h-3.5 w-3.5" />
                    Notifications push & email
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto text-xs">
                    Paramètres détaillés
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Besoin d’une alerte sur-mesure ?</CardTitle>
          <CardDescription>
            Configurez des déclencheurs avancés (stock, avis clients, vendeur, livraison) pour ne rien manquer.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full border-dashed">
            Paramétrer un déclencheur
          </Button>
          <Button size="sm" className="rounded-full">
            Démarrer l’assistant
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
