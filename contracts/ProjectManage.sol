// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Project.sol";
import "./TokenTemplate.sol";

contract ProjectManage is Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private totalProjectCount;

    address[] private founders;
    mapping(address => address[]) public ownerToProjects; // account -> project contract addresses

    event DeployedNewProject(address founderAddress, address contractAddress, address tokenAddress);

    constructor() {}

    function createProject(
        string memory name,
        string memory symbol,
        uint256 total,
        uint8 decimal,
        uint256 sellAmount,
        string[] memory _infoST,
        uint256[] memory _infoNB,
        address _investToken
    ) public returns (address, address) {
        require(_investToken != address(0), "Invalid address");

        if (ownerToProjects[msg.sender].length == 0) {
            founders.push(msg.sender);
        }

        address[] memory _infoAD = new address[](3);
        TokenTemplate newToken = new TokenTemplate(name, symbol, total, decimal, sellAmount, msg.sender);

        _infoAD[0] = address(newToken);
        _infoAD[1] = address(_investToken);

        Project newProject = new Project(
            _infoST,
            _infoNB,
            _infoAD, 
            sellAmount
        );
        IERC20(address(newToken)).transfer(address(newProject), IERC20(address(newToken)).balanceOf(address(this)));
        ownerToProjects[msg.sender].push(
            address(newProject)
        );

        totalProjectCount.increment();

        emit DeployedNewProject(msg.sender, address(newProject), address(newToken));
        return (address(newProject), address(newToken));
    }

    function getProjectContractOwner(address _owner)
        public
        view
        returns (address[] memory)
    {
        address[] memory projects = ownerToProjects[_owner];
        return projects;
    }

    function getProjectAllContract() public view  returns(address[] memory) {
        address[] memory projects = new address[](totalProjectCount.current());
        uint256 counter = 0;
        for(uint256 i = 0; i < founders.length; i++) {
            address[] memory founderProjects = ownerToProjects[founders[i]];
            for(uint ii = 0; ii < founderProjects.length; ii++) {
                projects[counter++] = founderProjects[ii];
            }
        }
        return projects;
    }

    function getAllFounders() public view returns(address[] memory) {
        return founders;
    }
}
