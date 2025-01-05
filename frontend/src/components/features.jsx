export const Features = (props) => {
  return (
    <div id="features" className="text-center">
      <div className="container">
        <div className="row">
          <div className="col-md-10 col-md-offset-1 section-title">
            <h2>Features</h2>
          </div>
        </div>
        <div className="row">
          {props.data
            ? props.data.map((d, i) => (
                <div 
                  key={`${d.title}-${i}`} 
                  className="col-md-4" // Changed from col-md-3 to col-md-4 for 3 columns
                >
                  <i className={d.icon}></i>
                  <h3>{d.title}</h3>
                  <p>{d.text}</p>
                </div>
              ))
            : "Loading..."}
        </div>
      </div>
    </div>
  );
};