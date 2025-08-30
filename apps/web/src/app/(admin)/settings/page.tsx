import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function Page() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres</CardTitle>
          <CardDescription>Préférences de votre compte</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="language">Langue</Label>
            <Select>
              <SelectTrigger id="language">
                <SelectValue placeholder="Français" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Notifications</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="email-notifs" />
              <Label htmlFor="email-notifs">Recevoir par e‑mail</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="push-notifs" />
              <Label htmlFor="push-notifs">Recevoir des notifications push</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


