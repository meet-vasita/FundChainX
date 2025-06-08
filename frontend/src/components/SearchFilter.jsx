// src/components/LandingPage.jsx
import React,{useState} from 'react';
import '../styles/SearchFilter.css';

const SearchFilter = ({ onSearch, onFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    onSearch(e.target.value);
  };
  
  const handleFilter = (e) => {
    setFilter(e.target.value);
    onFilter(e.target.value);
  };
  
  return (
    <div className="search-filter">
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearch}
        placeholder="Search campaigns..."
        className="search-input"
      />
      <div className="custom-select">
        <select 
          value={filter} 
          onChange={handleFilter}
          className="filter-select"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="successful">Successful</option>
          <option value="expired">Expired</option>
          <option value="aborted">Aborted</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <div className="select-arrow"></div>
      </div>
    </div>
  );
};

export default SearchFilter;