import { useTranslation } from "@/context/LanguageContext.tsx";

const ReportsContent = () => {
  const { t } = useTranslation();

  return (
    <div className="standard-view">
      <h2>{t.dashboardPage.content.reports.title}</h2>
      <div className="placeholder-card">
        {t.dashboardPage.content.reports.placeholder}
      </div>
    </div>
  );
};

export default ReportsContent;
