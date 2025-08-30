import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Favoris</CardTitle>
          <CardDescription>
            Retrouvez ici les offres que vous avez enregistrées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Vous n’avez pas encore de favoris.
            </p>
            <Button>Explorer des offres</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


