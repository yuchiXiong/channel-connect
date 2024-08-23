import { useNavigate } from "react-router-dom"

const useRefresh = () => {
  const navigate = useNavigate();

  return () => {
    navigate(0);
  }
}

export default useRefresh