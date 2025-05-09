import { useDispatch, useSelector } from 'react-redux';


export const useAppDispatch = useDispatch;
export const useAppSelector = (parent, reducer) => useSelector(state => reducer ? state[parent][reducer] : state[parent][`${parent}Reducer`]);