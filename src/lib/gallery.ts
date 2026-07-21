import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";
import g7 from "@/assets/gallery-7.jpg";
import g8 from "@/assets/gallery-8.jpg";

export interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
  tag: string;
}

export const galleryItems: GalleryItem[] = [
  {
    src: g1,
    alt: "Tartaleta de pistacho y frambuesa",
    caption: "Tartaleta de pistacho & frambuesa recién horneada.",
    tag: "#Repostería",
  },
  {
    src: g2,
    alt: "Barista preparando café",
    caption: "El café de especialidad es una liturgia diaria.",
    tag: "#Barismo",
  },
  {
    src: g3,
    alt: "Esfera de chocolate con caramelo",
    caption: "Esfera 70% + caramelo salado. Momento show.",
    tag: "#Chocolate",
  },
  {
    src: g4,
    alt: "Croissants recién horneados",
    caption: "72 horas de fermentación. Cada mañana.",
    tag: "#Bites",
  },
  {
    src: g5,
    alt: "Cheesecake de frutos rojos",
    caption: "Cheesecake, frutos del bosque y luz de tarde.",
    tag: "#Repostería",
  },
  {
    src: g6,
    alt: "Tarta personalizada con flores",
    caption: "Encargo especial: tarta minimal con flores naturales.",
    tag: "#Encargos",
  },
  {
    src: g7,
    alt: "Cookies con sal marina",
    caption: "Cookies de choco & sal Maldon.",
    tag: "#Bites",
  },
  {
    src: g8,
    alt: "Interior del local",
    caption: "Nuestra casa: ladrillo, acero y madera.",
    tag: "#144Reality",
  },
];
