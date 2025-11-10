import PointagesMobile from "./PointageMobile/PointagesMobile";
import PointagesListPage from "./PointagesListPage"; // ton composant desktop

const isMobile = window.innerWidth < 720 || /Mobi|Android/i.test(navigator.userAgent);

export default function PointagePage() {
  return isMobile ? <PointagesMobile /> : <PointagesListPage />;
}
