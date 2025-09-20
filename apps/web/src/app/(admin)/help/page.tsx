import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Page() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Aide</CardTitle>
          <CardDescription>Questions fréquentes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Comment créer une alerte ?</p>
            <p className="text-sm text-muted-foreground">
              Rendez‑vous dans la section « Alertes » puis cliquez sur « Créer une alerte ».
            </p>
          </div>
          <div>
            <p className="font-medium">Comment gérer mes favoris ?</p>
            <p className="text-sm text-muted-foreground">
              Dans « Favoris », vous pouvez supprimer ou ouvrir vos éléments enregistrés.
            </p>
          </div>
          <div>
            <p className="font-medium">Besoin d’assistance ?</p>
            <p className="text-sm text-muted-foreground">
              Écrivez‑nous: support@okeyo.ai
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


