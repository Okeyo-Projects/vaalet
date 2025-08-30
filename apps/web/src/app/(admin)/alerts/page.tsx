import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function Page() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Alertes</CardTitle>
          <CardDescription>
            Créez des alertes pour être notifié(e) des meilleures offres.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Tech</Badge>
              <span>Ordinateurs portables &lt; 1000€</span>
            </div>
            <Button variant="ghost" size="sm">Gérer</Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Maison</Badge>
              <span>Café en grains -30%</span>
            </div>
            <Button variant="ghost" size="sm">Gérer</Button>
          </div>
          <div className="pt-2">
            <Button>Créer une alerte</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


