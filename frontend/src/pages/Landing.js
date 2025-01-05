import React, { useState, useEffect } from "react";
import { Header } from "../components/header";
import { Features } from "../components/features";
import { About } from "../components/about";
import { Contact2 } from "../components/contact2";
import { Navigation } from "../components/navigation";
import JsonData from "../data/data.json";

const Landing = () => {
  const [landingPageData, setLandingPageData] = useState({});

  useEffect(() => {
    setLandingPageData(JsonData);
  }, []);

  return (
    <div>
      <Header data={landingPageData.Header} />
      <Features data={landingPageData.Features} />
      <About data={landingPageData.About} />
      <Contact2 data={landingPageData.Contact} />
    </div>
  )
}

export default Landing;