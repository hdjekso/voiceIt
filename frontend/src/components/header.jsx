import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from 'react-router-dom';

//with auth0
export const Header = (props) => {
  const { loginWithRedirect, isAuthenticated, logout } = useAuth0();
  const navigate = useNavigate(); 

  const routeChange = () =>{ 
    let path = `/dashboard`; 
    navigate(path);
  }

  return (
    <header id="header">
      <div className="intro">
        <div className="overlay">
          <div className="container">
            <div className="row">
              <div className="col-md-8 col-md-offset-2 intro-text">
                <h1>
                  {props.data ? props.data.title : "Loading"}
                  <span></span>
                </h1>
                <p>{props.data ? props.data.paragraph : "Loading"}</p>
                {!isAuthenticated ? (
                  <button
                    onClick={() => loginWithRedirect()}
                    className="btn btn-custom btn-lg"
                  >
                    Log In
                  </button>
                ) : (
                  <div>
                    <button
                      className="btn btn-custom btn-lg"
                      onClick={routeChange}
                      style={{ marginRight: '2rem' }}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        // Remove updatedName from localStorage
                        localStorage.removeItem('updatedName');
                        
                        // Log out the user
                        logout({ returnTo: window.location.origin });
                      }}
                      className="btn btn-custom btn-lg"
                    >
                      Log Out
                    </button>
                  </div>

                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};