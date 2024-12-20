import React from "react";

function Like() {
  "use client";

  const [likes, setLikes] = React.useState(100)
  
  return <button onClick={() => {setLikes(likes + 1)}}>❤️ {likes}</button>;
}

export default Like