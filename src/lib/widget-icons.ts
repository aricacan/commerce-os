import {
  BarChart3, LineChart, PieChart, TrendingUp, TrendingDown, Activity,
  Package, ShoppingCart, Wallet, Target, Truck, Store, Users, Tag,
  Award, Boxes, DollarSign, Percent, Gauge, Layers, MapPin, Calendar,
  AlertTriangle, Star, type LucideIcon,
} from 'lucide-react';

// Widget'lar için ikon kayıt defteri — kullanıcı bir string ismi (ör. "BarChart3") seçip DB'ye
// (widget configJson içine) yazar, WidgetCard bunu bileşene çevirir. lucide statik import
// edildiğinden dinamik isim→bileşen için bu açık registry gerekli (uygulamada başka yok).
export const WIDGET_ICONS: Record<string, LucideIcon> = {
  BarChart3, LineChart, PieChart, TrendingUp, TrendingDown, Activity,
  Package, ShoppingCart, Wallet, Target, Truck, Store, Users, Tag,
  Award, Boxes, DollarSign, Percent, Gauge, Layers, MapPin, Calendar,
  AlertTriangle, Star,
};

// Picker'da gösterilecek sıra (kayıt defterinin anahtarları).
export const WIDGET_ICON_NAMES = Object.keys(WIDGET_ICONS);

export const DEFAULT_WIDGET_ICON = 'BarChart3';

// İsim geçersizse varsayılana düşer — asla undefined döndürmez.
export function resolveWidgetIcon(name: string | undefined | null): LucideIcon {
  return (name && WIDGET_ICONS[name]) || WIDGET_ICONS[DEFAULT_WIDGET_ICON];
}
