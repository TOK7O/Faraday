import { useTranslation } from "../../../context/LanguageContext";

const PersonnelContent = () => {
  const { t } = useTranslation();

  return (
    <div className="standard-view">
      <h2>{t.dashboardPage.content.personnel.title}</h2>
      <div className="placeholder-card">
        {t.dashboardPage.content.personnel.placeholder}
      </div>
    </div>
  );
};
export default PersonnelContent;
